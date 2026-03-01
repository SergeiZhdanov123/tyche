const mongoose = require("mongoose");
const uri = "mongodb+srv://sergeizhdanov1234_db_user:KASTnGPT6fZOQUo9@tyche.rlrnxf0.mongodb.net/?appName=Tyche";
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }).then(() => {
    console.log("SUCCESS");
    process.exit(0);
}).catch(err => {
    console.error("FAIL", err.message);
    process.exit(1);
});
