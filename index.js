const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()


const port = process.env.PORT || 5000

const app = express()

app.use(cors())
app.use(express.json())






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8ky5qyn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{

    }
    finally{
        
    }
}


app.get('/', async (req, res) => {
    res.send('Bike Sales server is running')
})


app.listen(port, () => {
    console.log(`Bike Sales server is running on port ${port}`);
})