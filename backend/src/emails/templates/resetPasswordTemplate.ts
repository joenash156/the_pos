export const RESET_PASSWORD_HTML_CONTENT = `
  <html>
    <head>
      <style>
        a.reset-button:hover {
          background-color: #233ce3 !important;
        }
      </style>
    </head>
    <body style="font-family: sans-serif; line-height:1.6; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p style="color: #555;">Dear {firstname},</p>
        <p style="color: #555;">We received a request to reset your password. Click the button below to create a new password:</p>
        <a 
          href="{resetUrl}" 
          class="reset-button"
          style="
            display: inline-block; 
            padding: 10px 20px; 
            background-color: #0070f3; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px;
            transition: ease-in-out 0.2s all;
          "
        >
          Reset Password
        </a>
        <p style="color: #555;">If you didn't request any password reset, please ignore this email.</p>
        <p style="color: #777; font-size: 0.9em;">Thank you.<br/> Your Team, SwiftJonny POS</p>
      </div>
    </body>
  </html>
`;
