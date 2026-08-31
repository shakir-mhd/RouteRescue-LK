import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { toEmail, otpCode, garageName } = await req.json();

    if (!toEmail || !otpCode) {
      return NextResponse.json({ error: 'Missing toEmail or otpCode' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER || 'routerescuelk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD || 'blfm gqvq rmvm qnwx';

    if (!gmailPass) {
      console.log(`[SECURITY EMAIL SIMULATED] To: ${toEmail} | Code: ${otpCode}`);
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Security code generated. Set GMAIL_APP_PASSWORD in .env to dispatch live emails to inbox.',
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const mailOptions = {
      from: `"RouteRescue LK Security" <${gmailUser}>`,
      to: toEmail,
      subject: `🛡️ ${otpCode} is your RouteRescue LK Security Verification Code`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #f97316; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">ROUTE RESCUE LK</h2>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Sri Lanka Intelligent Roadside Rescue Network</p>
          </div>
          
          <div style="background-color: #0f172a; padding: 24px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
            <p style="color: #e2e8f0; font-size: 13px; margin-bottom: 14px;">Security Verification Code for <strong>${garageName || 'Garage Owner'}</strong>:</p>
            <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #10b981; font-family: monospace; padding: 14px 20px; background-color: #020617; border-radius: 10px; display: inline-block; border: 1px solid #059669;">
              ${otpCode}
            </div>
            <p style="color: #64748b; font-size: 11px; margin-top: 18px;">This security verification code expires in 10 minutes. Do not share this code with anyone.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #475569;">
            © 2026 RouteRescue LK • Road Safety & Rescue Operations Sri Lanka
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: `Email dispatched to ${toEmail}!` });
  } catch (err: any) {
    console.error('Send Email Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
  }
}
