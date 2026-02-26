import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { getS3Client, deleteFileFromS3, getPresignedUrl } from '../../utils/s3.js';

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

export const uploadMiddleware: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ success: false, message: 'File too large. Max size is 5MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, message: 'Unexpected field. Use field name "file" for the upload.' });
        }
      }
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
};

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Send multipart/form-data with field name "file".' });
    }

    if (!process.env.S3_BUCKET_NAME) {
      return res.status(503).json({ success: false, message: 'File upload is not configured (S3_BUCKET_NAME missing).' });
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

    await getS3Client().send(command);

    // Generate public URL
    const staticUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
    
    // Generate a presigned URL for the frontend to display immediately
    const fileUrl = await getPresignedUrl(staticUrl);

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        staticUrl, // Keep reference to static URL for database storage
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
      return res.status(400).json({ success: false, message: 'File URL is required in request body (JSON).' });
    }

    if (!process.env.S3_BUCKET_NAME) {
      return res.status(503).json({ success: false, message: 'File delete is not configured (S3_BUCKET_NAME missing).' });
    }

    await deleteFileFromS3(fileUrl);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
