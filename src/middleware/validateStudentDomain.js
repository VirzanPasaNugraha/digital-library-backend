const ALLOWED_DOMAIN = "student.unsap.ac.id";

export default function validateStudentDomain(req, res, next) {
  const email = String(req.body?.email || "").trim();

  const ok = /^[^\s@]+@student\.unsap\.ac\.id$/i.test(email);
  if (!ok) {
    return res.status(400).json({
      message: `Registrasi hanya untuk email @${ALLOWED_DOMAIN}`,
    });
  }
  next();
}
