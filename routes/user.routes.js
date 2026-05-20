const express = require('express');
const router = express.Router();
const supabase = require('../models/supabase');

router.get('/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (error) throw error;

    res.json({
      mensaje: '🔥 Conectado a Supabase correctamente',
      data: data
    });

  } catch (error) {
    res.status(500).json({
      mensaje: '❌ Error',
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email } = req.body;

    const { data, error } = await supabase
      .from('users')
      .insert([
        { first_name, last_name, email }
      ]);

    if (error) throw error;

    res.json({ mensaje: 'Usuario creado', data });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ mensaje: 'Usuario eliminado' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;