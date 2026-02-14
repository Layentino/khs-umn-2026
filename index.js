const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'umn-secured-portal-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}));

function checkAuth(req, res, next) {
    if (!req.session.user) return res.redirect('/?error=session');
    next();
}

// 1. HALAMAN LOGIN (Identik Desain Anda & Bebas Teks Pengganggu)
app.get('/', (req, res) => {
    let notify = req.query.error ? `<div class="bg-red-50 text-red-600 p-3 rounded-lg text-[10px] font-bold mb-4 text-center border border-red-200">ID Pengguna atau Kata Sandi salah!</div>` : "";
    res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Login - KHS UMN</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms"></script>
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <script>
      tailwind.config = { theme: { extend: { colors: { "primary": "#f5f5db", "academic-navy": "#1e293b" } } } }
    </script>
    <style>body { font-family: 'Lexend', sans-serif; }</style>
</head>
<body class="bg-[#f5f5db]/40 flex items-center justify-center min-h-screen p-4">
    <div class="w-full max-w-[450px] animate-fade-in relative z-10">
        <div class="bg-white rounded-xl shadow-xl overflow-hidden border border-primary/30">
            <div class="pt-10 pb-6 flex flex-col items-center">
                <div class="w-20 h-20 bg-[#1e293b] rounded-full flex items-center justify-center mb-4 shadow-md text-white">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14v7"/></svg>
                </div>
                <h1 class="text-[#1e293b] text-2xl font-bold px-6 text-center leading-tight">Sistem Informasi Akademik</h1>
                <p class="text-gray-500 text-sm mt-1 font-medium italic">Kartu Hasil Studi (KHS)</p>
            </div>
            <div class="px-8 pb-10">
                ${notify}
                <form action="/login" method="POST" class="space-y-5">
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1e293b] transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                        </div>
                        <input name="nim" required class="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-[#1e293b] outline-none transition-all placeholder:text-slate-400 text-slate-800" placeholder="NIM atau NIP">
                    </div>
                    <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1e293b] transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
                        </div>
                        <input name="password" type="password" required class="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-[#1e293b] outline-none transition-all placeholder:text-slate-400 text-slate-800" placeholder="Password">
                    </div>
                    <button type="submit" class="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-semibold py-3.5 rounded-lg shadow-lg transition-all active:scale-[0.98]">Masuk</button>
                </form>
            </div>
            <div class="bg-slate-50 border-t border-slate-100 py-4 px-8 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>BCRYPT PROTECTED</span><div class="flex gap-2 items-center text-green-500"><div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>Sistem Aktif</div>
            </div>
        </div>
    </div>
</body>
</html>`);
});

// 2. LOGIKA LOGIN (Dual-Mode: Teks & Hash)
app.post('/login', async (req, res) => {
    const { nim, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE nim = $1', [nim]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            let isMatch = user.password.startsWith('$2b$') ? await bcrypt.compare(password, user.password) : (password === user.password);
            if (isMatch) {
                req.session.user = user;
                res.redirect(user.role === 'guru' ? '/dashboard-guru' : '/dashboard-murid');
            } else { res.redirect('/?error=1'); }
        } else { res.redirect('/?error=1'); }
    } catch (err) { res.status(500).send(err.message); }
});

// 3. DASHBOARD GURU (Update, Hapus, Registrasi, PW Admin)
app.get('/dashboard-guru', checkAuth, async (req, res) => {
    if (req.session.user.role !== 'guru') return res.redirect('/');
    const data = await pool.query('SELECT * FROM mahasiswa ORDER BY nim ASC');
    let rows = data.rows.map(m => `
        <tr class="border-b hover:bg-slate-50 transition text-sm">
            <td class="p-4 font-mono">${m.nim}</td>
            <td class="p-4 font-bold text-slate-700">${m.nama}</td>
            <td class="p-4">
                <form action="/update-nilai" method="POST" class="flex gap-2 items-center">
                    <input type="hidden" name="nim" value="${m.nim}">
                    <input type="number" name="nilai" value="${m.nilai}" class="w-16 p-2 border rounded-lg text-center font-bold outline-none focus:ring-1 focus:ring-[#1e293b]">
                    <button type="submit" class="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Update</button>
                    <a href="/hapus-mahasiswa/${m.nim}" onclick="return confirm('Hapus data ini?')" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm ml-2 text-center leading-[1.5]">Hapus</a>
                </form>
            </td>
        </tr>`).join('');

    res.send(`<script src="https://cdn.tailwindcss.com"></script><body class="bg-slate-50 p-6 font-['Lexend'] text-[#1e293b]"><div class="max-w-6xl mx-auto space-y-6"><div class="flex justify-between items-center bg-white p-8 rounded-2xl shadow-xl border-t-8 border-[#1e293b]"><h2 class="text-2xl font-black italic uppercase">Admin Dashboard</h2><a href="/logout" class="bg-red-50 text-red-500 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-red-500 hover:text-white transition">Logout</a></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="lg:col-span-2 bg-white p-8 rounded-2xl shadow-xl border border-slate-100"><h3 class="font-black text-[#1e293b] mb-6 text-xs uppercase tracking-widest italic">Registrasi Mahasiswa Baru</h3><form action="/tambah-mahasiswa" method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-4"><input name="nim" placeholder="NIM" class="border p-4 rounded-xl outline-none focus:border-[#1e293b] bg-slate-50" required><input name="nama" placeholder="Nama Mahasiswa" class="border p-4 rounded-xl outline-none focus:border-[#1e293b] bg-slate-50" required><input name="jurusan" placeholder="Jurusan" class="border p-4 rounded-xl outline-none focus:border-[#1e293b] bg-slate-50" required><input name="new_password" type="password" placeholder="Password Akun" class="border p-4 rounded-xl outline-none focus:border-[#1e293b] bg-slate-50" required><button class="md:col-span-2 bg-[#1e293b] text-white font-black py-4 rounded-xl hover:bg-slate-700 transition shadow-lg text-xs uppercase">Simpan Data Mahasiswa</button></form></div><div class="bg-white p-8 rounded-2xl shadow-xl border border-slate-100"><h3 class="font-black text-red-600 mb-6 text-xs uppercase tracking-widest italic">Ganti Password Admin</h3><form action="/ganti-password-admin" method="POST" class="space-y-4"><input name="pw_baru" type="password" placeholder="Password Baru" class="w-full border p-4 rounded-xl outline-none focus:border-red-500 bg-red-50/30" required><button class="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition shadow-lg text-xs uppercase text-center leading-[1.5]">Update Password</button></form></div></div><div class="bg-white rounded-2xl shadow-xl overflow-hidden"><table class="w-full text-left"><thead class="bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-widest"><tr><th class="p-5">NIM</th><th class="p-5">Nama Mahasiswa</th><th class="p-5">Aksi Nilai & Data</th></tr></thead><tbody>${rows}</tbody></table></div></div></body>`);
});

// 4. LOGIKA PROSES (TAMBAH, UPDATE, HAPUS, GANTI PW)
app.post('/tambah-mahasiswa', checkAuth, async (req, res) => {
    const { nim, nama, jurusan, new_password } = req.body;
    try {
        const hashed = await bcrypt.hash(new_password, 10);
        await pool.query('INSERT INTO mahasiswa (nim, nama, jurusan, nilai) VALUES ($1, $2, $3, 0)', [nim, nama, jurusan]);
        await pool.query('INSERT INTO users (nim, password, role) VALUES ($1, $2, $3)', [nim, hashed, 'murid']);
        res.redirect('/dashboard-guru');
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/update-nilai', checkAuth, async (req, res) => {
    await pool.query('UPDATE mahasiswa SET nilai = $1 WHERE nim = $2', [req.body.nilai, req.body.nim]);
    res.redirect('/dashboard-guru');
});

app.get('/hapus-mahasiswa/:nim', checkAuth, async (req, res) => {
    if (req.session.user.role !== 'guru') return res.redirect('/');
    await pool.query('DELETE FROM users WHERE nim = $1', [req.params.nim]);
    await pool.query('DELETE FROM mahasiswa WHERE nim = $1', [req.params.nim]);
    res.redirect('/dashboard-guru');
});

app.post('/ganti-password-admin', checkAuth, async (req, res) => {
    const hashed = await bcrypt.hash(req.body.pw_baru, 10);
    await pool.query('UPDATE users SET password = $1 WHERE nim = $2', [hashed, req.session.user.nim]);
    res.send("<script>alert('Password Admin Berhasil Diubah!'); window.location='/dashboard-guru';</script>");
});

// 5. DASHBOARD MURID
app.get('/dashboard-murid', checkAuth, async (req, res) => {
    const data = await pool.query('SELECT * FROM mahasiswa WHERE nim = $1', [req.session.user.nim]);
    const m = data.rows[0];
    res.send(`<script src="https://cdn.tailwindcss.com"></script><body class="bg-[#1e293b] min-h-screen flex items-center justify-center p-6 text-center font-['Lexend']"><div class="bg-white p-20 rounded-[60px] shadow-2xl max-w-xl w-full relative overflow-hidden"><h1 class="text-4xl font-black text-slate-800 italic">${m.nama}</h1><p class="text-slate-400 font-bold mb-10 tracking-widest uppercase italic">${m.jurusan} - ${m.nim}</p><div class="bg-slate-50 rounded-[40px] py-16 mb-12 shadow-inner border border-slate-100"><span class="text-slate-400 text-xs font-black uppercase tracking-widest">Index Nilai</span><h2 class="text-9xl font-black text-[#1e293b] mt-4">${m.nilai || 0}</h2></div><a href="/logout" class="text-slate-400 font-bold hover:text-red-500 transition-all text-xl uppercase underline">Logout</a></div></body>`);
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// Port Dinamis untuk Free Hosting
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Berjalan di Port ${PORT}`));