const app = require("./index");

if (app) {
  app.listen({ port: 3000 }, () => {
    // tslint:disable-next-line
    console.log(`🚀 Server ready at http://localhost:3000`);
  });
}
