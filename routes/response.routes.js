const express = require("express");
const router = express.Router();
const supabase = require("../models/supabase");

/* OBTENER TODAS LAS RESPUESTAS */
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("responses")
        .select("*");

    if (error) return res.status(500).json(error);

    res.json(data);
});

/* CREAR RESPUESTA */
router.post("/", async (req, res) => {
    try {
        const { request_id, user_id, message } = req.body;

        const { data, error } = await supabase
            .from("responses")
            .insert([{ request_id, user_id, message }])
            .select();

        if (error) {
            console.log(error);
            return res.status(500).json(error);
        }

        res.json({ mensaje: "Respuesta registrada", data });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;