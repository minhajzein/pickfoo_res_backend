import nodemailer from 'nodemailer';

export const sendEmail = async (options: { email: string; subject: string; html: string }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials (EMAIL_USER, EMAIL_PASS) are missing in the .env file');
  }

  // Debugging (Remove in production)
  console.log(`[Email] Attempting to send from: ${process.env.EMAIL_USER}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: `"Pickfoo Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(message);
};

export const getOTPTemplate = (otp: string, name: string) => {
  return `
    <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #98E32F;text-decoration:none;font-weight:600">Pickfoo</a>
        </div>
        <p style="font-size:1.1em">Hi ${name},</p>
        <p>Thank you for choosing Pickfoo. Use the following OTP to complete your registration procedures. OTP is valid for 10 minutes</p>
        <h2 style="background: #98E32F;margin: 0 auto;width: max-content;padding: 0 10px;color: #013644;border-radius: 4px;">${otp}</h2>
        <p style="font-size:0.9em;">Regards,<br />Pickfoo Team</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>Pickfoo Inc</p>
          <p>India</p>
        </div>
      </div>
    </div>
  `;
};
