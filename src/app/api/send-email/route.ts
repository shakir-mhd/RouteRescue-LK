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
    const hostOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://route-rescue-lk.vercel.app';
    const callbackLink = `${hostOrigin}/auth/callback?verified=true`;

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
        <div style="font-family: Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 28px; border-radius: 20px; max-width: 520px; margin: 0 auto; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #f97316; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">ROUTE RESCUE <span style="background-color: #10b981; color: #020617; padding: 2px 6px; border-radius: 4px; font-size: 14px;">LK</span></h2>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 6px;">Sri Lanka Intelligent Roadside Rescue & Safety Network</p>
          </div>
          
          <div style="background-color: #0f172a; padding: 24px; border-radius: 16px; border: 1px solid #334155; text-align: center;">
            <p style="color: #e2e8f0; font-size: 14px; margin-bottom: 16px;">Garage Owner Verification for <strong>${garageName || 'Garage Owner'}</strong>:</p>
            
            <!-- OPTION 1: 4-DIGIT CODE -->
            <div style="margin-bottom: 20px;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Option 1: Security OTP Code</span>
              <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #10b981; font-family: monospace; padding: 14px 24px; background-color: #020617; border-radius: 12px; display: inline-block; border: 1px solid #059669;">
                ${otpCode}
              </div>
            </div>

            <!-- OPTION 2: 1-CLICK MAGIC LINK BUTTON -->
            <div style="border-t: 1px solid #1e293b; pt: 18px; margin-top: 18px;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 10px;">Option 2: 1-Click Instant Activation</span>
              <a href="${callbackLink}" target="_blank" style="background-color: #10b981; color: #020617; text-decoration: none; padding: 12px 28px; font-weight: 800; font-size: 13px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                ⚡ Activate Garage Portal
              </a>
            </div>

            <p style="color: #64748b; font-size: 11px; margin-top: 20px;">This link and security code expire in 10 minutes. Do not share with anyone.</p>
          </div>
          
          <div style="text-align: center; margin-top: 24px; font-size: 10px; color: #475569;">
            Designed for Road Safety & Rescue Operations in Sri Lanka.<br/>
            © 2026 RouteRescue LK. All Rights Reserved.
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
