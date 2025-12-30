import { sendMail } from "./mailer.js";

/**
 * Email saat dokumen DITERIMA
 */
export async function sendAcceptedMail(doc) {
  const recipients = [
    doc.owner?.email,
    process.env.MAIL_ADMIN_EMAIL,
  ].filter(Boolean);

  const html = `
    <h2>Dokumen DITERIMA</h2>

    <p>Dokumen berikut telah <b>DITERIMA</b>:</p>

    <table border="1" cellpadding="6" cellspacing="0" width="100%">
      <tr><td><b>Judul</b></td><td>${doc.judul}</td></tr>
      <tr><td><b>Jenis</b></td><td>${doc.tipe}</td></tr>
      <tr><td><b>Penulis</b></td><td>${doc.penulis}</td></tr>
      <tr><td><b>NIM</b></td><td>${doc.nim}</td></tr>
      <tr><td><b>Prodi</b></td><td>${doc.prodi}</td></tr>
      <tr><td><b>Fakultas</b></td><td>${doc.fakultas}</td></tr>
      <tr><td><b>Tahun</b></td><td>${doc.tahun}</td></tr>
      <tr>
        <td><b>Keywords</b></td>
        <td>${(doc.keywords || []).join(", ") || "-"}</td>
      </tr>
    </table>

    <p><b>Abstrak:</b></p>
    <p>${doc.abstrak || "-"}</p>

    <hr/>
    <p>Digital Library FTI</p>
  `;

  await sendMail({
    to: recipients.join(","),
    subject: "Dokumen DITERIMA – Digital Library FTI",
    html,
  });
}

/**
 * Email saat dokumen DITOLAK
 */
export async function sendRejectedMail(doc) {
  const recipients = [
    doc.owner?.email,
    process.env.MAIL_ADMIN_EMAIL,
  ].filter(Boolean);

  const html = `
    <h2>Dokumen DITOLAK</h2>

    <p><b>Judul:</b> ${doc.judul}</p>
    <p><b>Penulis:</b> ${doc.penulis}</p>
    <p><b>NIM:</b> ${doc.nim}</p>
    <p><b>Prodi:</b> ${doc.prodi}</p>

    <p><b>Alasan Penolakan:</b></p>
    <p style="color:red;">${doc.alasanPenolakan}</p>

    <hr/>
    <p>Digital Library FTI</p>
  `;

  await sendMail({
    to: recipients.join(","),
    subject: "Dokumen DITOLAK – Digital Library FTI",
    html,
  });
}
