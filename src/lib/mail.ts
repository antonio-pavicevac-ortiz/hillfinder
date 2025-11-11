import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Hillfinder Support" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "Reset your Hillfinder password",
    html: `
      <p>Hello,</p>
      <p>You requested a password reset. Click the link below to create a new password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 15 minutes.</p>
      <p>If you didn’t request this, you can safely ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
