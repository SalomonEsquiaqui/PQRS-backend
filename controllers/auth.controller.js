const bcrypt = require('bcrypt')

const supabase = require('../config/supabase')
 

/* =========================
   REGISTRO
========================= */

exports.register = async (req, res) => {

    try {

        const {

            first_name,
            last_name,
            email,
            password,

            phone,
            address,

            user_type,

            identification_type_id,

            identification_number

        } = req.body



        // VALIDAR USUARIO EXISTENTE
        const {
            data: existingUser
        } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()



        if (existingUser) {

            return res.status(400).json({
                error: 'El usuario ya existe'
            })

        }



        // ENCRIPTAR PASSWORD
        const hashedPassword =
            await bcrypt.hash(password, 10)



        // INSERTAR USUARIO
        const {
            data,
            error
        } = await supabase
            .from('users')
            .insert([
                {

                    first_name,
                    last_name,
                    email,

                    password: hashedPassword,

                    phone,
                    address,

                    user_type,

                    identification_type_id,

                    identification_number

                }
            ])
            .select()
            .single()



        if (error) {

            console.log(error)

            return res.status(400).json(error)

        }



        console.log("USUARIO REGISTRADO:")
        console.log(data)



        res.json({

            success: true,

            user: data

        })

    }

    catch (err) {

        console.log(err)

        res.status(500).json({
            error: err.message
        })

    }

}




/* =========================
   LOGIN
========================= */

exports.login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body



        // BUSCAR USUARIO
        const {
            data: user,
            error
        } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()



        if (error || !user) {

            return res.status(404).json({
                error: 'Usuario no encontrado'
            })

        }



        console.log("LOGIN USER:")
        console.log(user)



        // VALIDAR PASSWORD
        const validPassword =
            await bcrypt.compare(
                password,
                user.password
            )



        if (!validPassword) {

            return res.status(401).json({
                error: 'Contraseña incorrecta'
            })

        }



        res.json({

            success: true,

            user

        })

    }

    catch (err) {

        console.log(err)

        res.status(500).json({
            error: err.message
        })

    }

}