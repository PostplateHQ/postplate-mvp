const nodemailer = require("nodemailer");

const REMINDER_FROM =
  process.env.MAIL_FROM_REMINDERS || "PostPlate <no-reply@postplate.com>";
const PROMO_FROM =
  process.env.MAIL_FROM_PROMOS || "PostPlate <no-hello@postplate.com>";
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@postplate.com";

function buildTransport() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    return {
      mode: "smtp",
      transporter: nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: SMTP_SECURE === "true",
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      }),
    };
  }

  return {
    mode: "preview",
    transporter: nodemailer.createTransport({
      jsonTransport: true,
    }),
  };
}

async function sendReminderEmail(redemption) {
  const { mode, transporter } = buildTransport();
  const greetingName = redemption.name || "there";
  const subject = "Your offer is still waiting 🎉";
  const message = [
    `Hi ${greetingName},`,
    "",
    `Your offer from ${redemption.restaurant} is still active.`,
    "",
    `Offer: ${redemption.offer}`,
    `Code: ${redemption.code}`,
    "",
    "Show this code at the counter before the offer expires.",
    "",
    `If you have any issues with this offer or questions, please contact ${SUPPORT_EMAIL}.`,
    "",
    "Thanks,",
    "PostPlate",
  ].join("\n");

  const info = await transporter.sendMail({
    from: REMINDER_FROM,
    replyTo: SUPPORT_EMAIL,
    to: redemption.email,
    subject,
    text: message,
  });

  return {
    mode,
    info,
    preview: {
      to: redemption.email,
      subject,
      text: message,
      code: redemption.code,
      restaurant: redemption.restaurant,
      from: REMINDER_FROM,
      replyTo: SUPPORT_EMAIL,
    },
  };
}

module.exports = {
  PROMO_FROM,
  REMINDER_FROM,
  SUPPORT_EMAIL,
  sendReminderEmail,
};
