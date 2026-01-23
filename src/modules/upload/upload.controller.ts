import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import multer from 'multer';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

export const uploadMiddleware: RequestHandler = upload.single('file');

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { folder = 'general' } = req.body;
    const file = req.file;

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFileName = `${folder}/${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL: 'public-read', // Removed as bucket does not allow ACLs
    });

    await s3Client.send(command);

    // Generate public URL
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File URL is required' });
    }

    // Extract Key from URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/folder/filename.ext
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2) {
        return res.status(400).json({ success: false, message: 'Invalid file URL' });
    }
    const key = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    await s3Client.send(command);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
