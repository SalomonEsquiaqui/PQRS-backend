const express = require('express');
const router  = express.Router();

router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;
        const secretKey = '6Le6ZvEsAAAAAOWs6SpTMsQoBb0kYC8apCQNglH7';

        const response = await fetch(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (!data.success) {
            return res.json({ valid: false, message: 'Captcha inválido' });
        }

        res.json({ valid: true });

    } catch (err) {
        res.status(500).json({ valid: false, message: err.message });
    }
});

module.exports = router;