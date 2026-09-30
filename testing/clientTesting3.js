const { strawberry, connectSandBox } = require("../dist/proxy/strawberry");

const connectionString1 =
    "postgresql://neondb_owner:npg_PThOfAVw6RJ1@ep-nameless-heart-axrai6u9-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

    const connectionString2 =
    "mongodb+srv://kashyapdas2234_db_user:Kashyap123das@cluster0.4efyy7t.mongodb.net/strawberry";


async function call(){
    await connectSandBox(connectionString2);
    const userSchema = await strawberry.user.createSchema({
        name: {
            type: "string",
            required: true,
            minLength: 3,
            maxLength: 30
        },

        email: {
            type: "string",
            required: true,
            unique: true,
            lowercase: true
        },

        age: {
            type: "int",
            min: 18,
            max: 100
        },

        isActive: {
            type: "boolean",
            default: true
        }
    });
    console.log(userSchema);

}
call();


