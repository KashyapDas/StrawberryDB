const { strawberry, connectSandBox } = require("../dist/proxy/strawberry");

const connectionString1 =
    "postgresql://neondb_owner:npg_PThOfAVw6RJ1@ep-nameless-heart-axrai6u9-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

    const connectionString2 =
    "mongodb+srv://kashyapdas2234_db_user:Kashyap123das@cluster0.4efyy7t.mongodb.net/strawberry";


async function call(){
    await connectSandBox(connectionString2);
    const userTable = await strawberry.users.createSchema({
        name: {
            type: "string",
            required: true
        },

        email: {
            type: "string",
            required: true,
            unique: true
        }
    });
    const accountTable = await strawberry.account.createSchema({
        accountNumber: {
            type: "string",
            required: true,
            unique: true
        },

        balance: {
            type: "float",
            default: 0
        }
    });
    
    const userAccountRelationship = await strawberry.users.createRelation("account","accountId");
    
    console.log(userAccountRelationship);
}
call();


