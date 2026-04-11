const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const LOGO_URL = `${FRONTEND_URL}/images/logo.png`;

/**
 * Common Email Layout Wrapper
 */
const wrapLayout = (title, content, footerText = '') => `
  <div style="background-color: #f8fafc; padding: 40px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      <!-- Header -->
      <tr>
        <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
          <img src="${LOGO_URL}" alt="SYICT Logo" width="180" style="display: block; margin-bottom: 20px;" onerror="this.src='https://syictbd.com/images/logo.png'; this.onerror=null;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${title}</h1>
        </td>
      </tr>
      
      <!-- Body -->
      <tr>
        <td style="padding: 40px; color: #1e293b; line-height: 1.6; font-size: 16px;">
          ${content}
        </td>
      </tr>
      
      <!-- Footer -->
      <tr>
        <td align="center" style="padding: 30px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 500;">SYICT — Smart Youth ICT Solutions</p>
          <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">Head Office: Dhaka, Bangladesh</p>
          <div style="margin-top: 20px;">
            <a href="${FRONTEND_URL}" style="color: #db2777; text-decoration: none; font-weight: 600; font-size: 14px; margin: 0 10px;">Website</a>
            <a href="${FRONTEND_URL}/support" style="color: #db2777; text-decoration: none; font-weight: 600; font-size: 14px; margin: 0 10px;">Support</a>
          </div>
          <p style="margin-top: 25px; color: #cbd5e1; font-size: 11px;">${footerText || "You're receiving this because you're a valued member of the SYICT community."}</p>
        </td>
      </tr>
    </table>
  </div>
`;

module.exports = { wrapLayout, FRONTEND_URL };
