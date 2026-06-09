const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Office Management System",
      version: "1.0.0",
      description: "Swagger API documentation (Local & Live)",
      contact: {
        name: "API Support",
        email: "support@myproject.com",
      },
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
      {
        url: "https://salmon-tapir-632940.hostingersite.com",
        description: "Live Production Server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // swagger comments kaha se read honge
  apis: ["./routes/*.js", "./index.js"],
};

module.exports = swaggerJSDoc(options);
