const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API AWS',
            version: '0.0.1',
            description: 'API que vai interagir com CRUD MySQL e CRUD MongoDB em ambiente de nuvem',
        }
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app) => {
    app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Swagger rodando em: http://localhost:3000/swagger');
};

module.exports = swaggerDocs;
