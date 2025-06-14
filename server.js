require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors')

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: '*'
}));

//mySQL
const mysql = require('mysql2');
//mongoDB
const mongoose = require('mongoose');
//swagger
const swaggerDocs = require('./swagger');
//S3
const AWS = require('aws-sdk');
//Log
const { logInfo, logError } = require('./logger');

app.use(express.json());

/**
* @swagger
* tags:
*   - name: CRUD MySQL
*     description: Operações de CRUD para product no MySQL
*   - name: CRUD MongoDb 
*     description: Operações de CRUD para usuários no MongoDb.
*   - name: Buckets
*     description: Operações de Listar buckets, upload e remoção de arquivo para um bucket S3.
*/

//#region CRUD MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
}).promise();

const DB_NAME = process.env.DB_NAME;

/**
 * @swagger
 * /init-db:
 *   post:
 *     tags:
 *       - CRUD MySQL
 *     summary: Cria o banco de dados e a tabela produto
 *     responses:
 *       200:
 *         description: Banco de dados e tabela criados com sucesso
 */
app.post('/init-db', async (req, res) => {
    try {
        const createDB = `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`; USE \`${DB_NAME}\`;
      CREATE TABLE IF NOT EXISTS product (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL
      );`;
        await pool.query(createDB);
        res.send('db and table created with success!');
    } catch (err) {
        console.error(error)
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /produtos:
 *   get:
 *     summary: Lista todos os produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 */
app.get('/product', async (req, res) => {
  try {
    await pool.query(`USE \`${DB_NAME}\``);
    const [rows] = await pool.query('SELECT * FROM product');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /product/{id}:
 *   get:
 *     tags:
 *       - CRUD MySQL
 *     summary: Busca um produto pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produto encontrado
 *       404:
 *         description: Produto não encontrado
 */
app.get('/product/:id', async (req, res) => {
    try {
        await pool.query(`USE \`${DB_NAME}\``);
        const [rows] = await pool.query('SELECT * FROM product WHERE id = ?', [req.params.id])
        if (rows.length === 0) return res.status(404).json({ error: 'Product cant be found' })
        res.json(rows[0])
    } catch (error) {
        console.error(error)
        res.status(500).send(error)
    }
})

/**
 * @swagger
 * /product:
 *   post:
 *     tags:
 *       - CRUD MySQL
 *     summary: Cria um novo produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Produto criado
 */
app.post('/product', async (req, res) => {
    const { name, description, price } = req.body

    try {
        await pool.query(`USE \`${DB_NAME}\``)
        const [result] = await pool.query(
            'INSERT INTO product (name, description, price) VALUES (?, ?, ?)',
            [name, description, price]
        );
        res.status(201).send(result)
    } catch (error) {
        console.error(error)
        res.status(500).send(error)
    }
})

/**
 * @swagger
 * /product/{id}:
 *   put:
 *     tags:
 *       - CRUD MySQL
 *     summary: Atualiza um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Produto atualizado
 *       404:
 *         description: Produto não encontrado
 */
app.put('/product/:id', async (req, res) => {
    const { name, description, price } = req.body

    try {
        await pool.query(`USE \`${DB_NAME}\``);
        const [result] = await pool.query(
            'UPDATE product SET name = ?, description = ?, price = ? WHERE id = ?',
            [name, description, price, req.params.id]
        )
        if (result.affectedRows === 0) return res.status(404).send("Product not found")
        res.status(201).send(result)
    } catch (error) {
        console.error(error)
        res.status(500).send(error)
    }
})

/**
 * @swagger
 * /product/{id}:
 *   delete:
 *     tags:
 *       - CRUD MySQL
 *     summary: Deleta um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produto deletado com sucesso
 *       404:
 *         description: Produto não encontrado
 */
app.delete('/product/:id', async (req, res) => {
    try {
        await pool.query(`USE \`${DB_NAME}\``);
        const [result] = await pool.query(
            'DELETE FROM product WHERE id = ?', [req.params.id]
        )
        if (result.affectedRows === 0) res.status(404).send("Product doesn't exist")
        res.status(200).send('Product Deleted with success!')
    } catch (error) {
        console.error(error)
        res.status(500).send(error)
    }
})


//#region CRUD MongoDb
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => logInfo('MongoDB conectado', null))
    .catch(err => logError('Erro ao logar mongodb' + err, null, err));

const UserSchema = new mongoose.Schema({
    name: String,
    email: String
});

const User = mongoose.model('Usuario', UserSchema);

/**
 * @swagger
 * /mongodb/testar-conexao:
 *   get:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Testa a conexão com o MongoDB
 *     description: Verifica se a aplicação consegue se conectar ao MongoDB.
 *     responses:
 *       200:
 *         description: Conexão bem-sucedida
 *       500:
 *         description: Erro na conexão com o MongoDB
 */
app.get('/mongodb/testar-conexao', async (req, res) => {
    try {
        //Tentando conectar ao MongoDB
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const user = await User.findOne(); //Consulta simples (primeiro usuário encontrado)

        logInfo('Conexão com o MongoDB efetuada com sucesso', req);

        if (user) {
            res.status(200).send('Conexão com o MongoDB bem-sucedida e usuário encontrado!');
        } else {
            res.status(200).send('Conexão com o MongoDB bem-sucedida, mas nenhum usuário encontrado.');
        }
    } catch (error) {
        await logError('Erro ao conectar no MongoDb' + error, req, error);
        res.status(500).send('Erro na conexão com o MongoDB');
    } finally {
        mongoose.connection.close();
    }
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Criar um novo usuário
 *     description: Este endpoint cria um novo usuário no sistema.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do usuário
 *               email:
 *                 type: string
 *                 description: Email do usuário
 *             required:
 *               - name
 *               - email
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID do usuário
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Requisição inválida.
 */
app.post('/usuarios', async (req, res) => {
    try {
        console.log("Recebido solicitacao de POST")
        const user = new User(req.body);
        await user.save();
        logInfo('Usuário criado', req);
        res.status(201).send(user);
    } catch (error) {
        logError("Erro ao criar usuário", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }
});

/**
 * @swagger
 * /usuarios:
 *   get:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Listar todos os usuários
 *     description: Este endpoint retorna todos os usuários cadastrados no sistema.
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 */
app.get('/usuarios', async (req, res) => {
    try {
        const users = await User.find();
        logInfo('Usuários encontrados', req, users);
        res.send(users);
    } catch (error) {
        logError("Erro ao buscar usuários", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }

});



/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Obter um usuário específico
 *     description: Este endpoint retorna um usuário baseado no ID fornecido.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Usuário não encontrado.
 */
app.get('/usuarios/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send('Usuário não encontrado');

        logInfo('Usuário encontrado', req, user);
        res.send(user);
    } catch (error) {
        logError("Erro ao buscar usuário", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }

});

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Atualizar um usuário específico
 *     description: Este endpoint atualiza um usuário baseado no ID fornecido.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Usuário não encontrado.
 */
app.put('/usuarios/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.status(404).send('Usuário não encontrado');

        logInfo('Usuário atualizado', req, user);
        res.send(user);
    } catch (error) {
        logError("Erro ao atualizar usuário", req, error);
        res.status(500).send('Ocorreu um erro interno');
    }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     tags:
 *       - CRUD MongoDb
 *     summary: Remover um usuário específico
 *     description: Este endpoint remove um usuário baseado no ID fornecido.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário removido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Usuário não encontrado.
 */
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const result = await User.deleteOne({ _id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).send('Usuário não encontrado');
        }

        logInfo('Usuário removido', req);
        res.send({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        logError("Erro ao remover usuário", req, error)
        res.status(500).send('Ocorreu um erro interno');
    }

});
//#endregion

//#region S3
AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION,
    sessionToken: process.env.SESSION_TOKEN,
});

const s3 = new AWS.S3();

/**
 * @swagger
 * /buckets:
 *   get:
 *     summary: Lista todos os buckets
 *     tags: 
 *       - Buckets
 *     responses:
 *       200:
 *         description: Lista de todos os buckets
 */
app.get('/buckets', async (req, res) => {
    try {
        const data = await s3.listBuckets().promise();
        logInfo('Buckets encontrados', req, data.Buckets);
        res.status(200).json(data.Buckets);
    } catch (error) {
        logError("Erro ao buscar buckets", req, error);
        res.status(500).json({ error: 'Erro ao listar buckets', details: error });
    }
});

/**
 * @swagger
 * /buckets/{bucketName}:
 *   get:
 *     summary: Lista os objetos de um bucket
 *     tags: 
 *       - Buckets
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         description: Nome do bucket
 *     responses:
 *       200:
 *         description: Lista dos objetos do bucket
 */
app.get('/buckets/:bucketName', async (req, res) => {
    const { bucketName } = req.params;
    const params = {
        Bucket: bucketName,
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        logInfo('Objetos encontrados', req, data.Contents);
        res.status(200).json(data.Contents);
    } catch (error) {
        logError("Erro ao buscar objetos", req, error);
        res.status(500).json({ error: 'Erro ao listar objetos do bucket', details: error });
    }
});

/**
 * @swagger
 * /buckets/{bucketName}/upload:
 *   post:
 *     summary: Faz o upload de um arquivo para um bucket
 *     tags: 
 *       - Buckets
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         description: Nome do bucket
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Arquivo enviado com sucesso
 */
//Utilizar alguma lib para fazer o upload/strem de arquivos, sugestão: multer
const multer = require('multer');
const multerS3 = require('multer-s3');

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: (req, file, cb) => cb(null, req.params.bucketName),
        key: (req, file, cb) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            cb(null, fileName);
        },
        acl: 'private', // ou 'public-read' se quiser acesso público
    }),
    limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/buckets/:bucketName/upload', upload.single('file'), async (req, res) => {
    console.log(req.file)
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    try {
        logInfo('Upload efetuado com sucesso', req, req.file);
        res.status(200).json({
            message: 'Upload efetuado com sucesso',
            fileUrl: req.file.location,  // A URL do arquivo no S3
        });
    } catch (error) {
        logError("Erro ao efetuar upload", req, error);
        res.status(500).json({ error: 'Erro no upload' });
    }
});


// app.post('/upload', upload.single('file'), async (req, res) => {
//     if (!req.file) {
//       return res.status(400).send('Nenhum arquivo foi enviado');
//     }

//     const file = req.file;

//     const params = {
//       Bucket: '3011392313040-dsm-vot-hml',  
//       Key: `uploads/${Date.now()}_${file.originalname}`, 
//       Body: file.buffer, 
//       ContentType: file.mimetype, 
//       ACL: 'public-read'
//     };

//     try {
//       const s3Response = await s3.upload(params).promise();
//       res.status(200).send({
//         message: 'Arquivo enviado com sucesso!',
//         fileUrl: s3Response.Location
//       });
//     } catch (err) {
//       console.error('Erro ao enviar para o S3:', err);
//       res.status(500).send({ message: 'Erro ao enviar o arquivo', error: err.message });
//     }
//   });





/**
 * @swagger
 * /buckets/{bucketName}/file/{fileName}:
 *   delete:
 *     summary: Deleta um arquivo específico de um bucket
 *     tags: 
 *       - Buckets
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         description: Nome do bucket
 *       - in: path
 *         name: fileName
 *         required: true
 *         description: Nome do arquivo a ser deletado
 *     responses:
 *       200:
 *         description: Arquivo deletado com sucesso
 */
app.delete('/buckets/:bucketName/file/:fileName', async (req, res) => {
    const { bucketName, fileName } = req.params; // Desestruturando os parâmetros para pegar o nome do bucket e do arquivo

    // Parâmetros para o método deleteObject do S3
    const params = {
        Bucket: bucketName,  // O nome do bucket
        Key: fileName,       // O nome do arquivo
    };

    try {
        // Deletando o arquivo do S3
        await s3.deleteObject(params).promise();

        // Log de sucesso, para entender quando o arquivo foi removido
        logInfo('Objeto removido com sucesso', req, params);

        // Respondendo ao cliente com uma mensagem de sucesso
        res.status(200).json({ message: 'Arquivo removido com sucesso.' });
    } catch (error) {
        // Se houver erro, loga o erro e responde com status 500
        logError("Erro ao remover objeto", req, error);

        // Respondendo ao cliente com uma mensagem de erro e detalhes sobre o erro
        res.status(500).json({ error: 'Erro ao remover o arquivo', details: error });
    }
});




const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    swaggerDocs(app);
    console.log('Servidor rodando na porta', PORT)
});
