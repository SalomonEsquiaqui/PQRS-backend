const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase')

// Valida si el PIN corresponde al rol enviado
router.post('/validate', async (req, res) => {
    try {
        const { role, pin } = req.body;

        if (!role || !pin) {
            return res.status(400).json({ valid: false, message: 'Faltan datos' });
        }

        const { data, error } = await supabase
            .from('role_pins')
            .select('id')
            .eq('role', role)
            .eq('pin', pin)
            .eq('active', true)
            .single();

        if (error || !data) {
            return res.json({ valid: false, message: 'PIN incorrecto' });
        }

        res.json({ valid: true, message: 'PIN válido' });

    } catch (err) {
        res.status(500).json({ valid: false, message: err.message });
    }
});

module.exports = router;