const { ApolloServerPluginLandingPageGraphQLPlayground, ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const { ApolloServer } = require('apollo-server-express')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { execute , subscribe } = require('graphql')
const {  SubscriptionServer } = require('subscriptions-transport-ws')
const express  = require('express')
const http  = require('http')
const User = require('./models/user')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const typeDefs = require('./schema')
const resolvers = require('./resolvers')
const JWT_SECRET = process.env.SECRET
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI

console.log('connecting to', MONGODB_URI)
mongoose.connect(MONGODB_URI)
 .then(() =>{
     console.log('connected to MongoDB')
 })
 .catch((error) =>{
     console.log('error connecting to MongoDb', error.message)
 })


const start = async () =>{
    const app = express()
    const httpServer = http.createServer(app)
    const schema = makeExecutableSchema({ typeDefs, resolvers })
    const subscriptionServer = SubscriptionServer.create(
        {
            schema,
            execute,
            subscribe
        },
        {
            server: httpServer,
            path: ''
        }
    )
    const server = new ApolloServer({
        schema,
        context:async ({req}) => {
            const auth = req ? req.headers.authorization : null
            if (auth && auth.toLowerCase().startsWith('bearer')){
                const decodedToken = jwt.verify(
                    auth.substring(7), JWT_SECRET
                )
                const currentUser = await User.findById(decodedToken.id).populate('friends')
                console.log(currentUser)
                return { currentUser }
            }
        },
        plugins:[
            ApolloServerPluginLandingPageGraphQLPlayground(),
            ApolloServerPluginDrainHttpServer({ httpServer}),
            {
                async serverWillStart(){
                    return{
                        async drainServer(){
                            SubscriptionServer.close()
                        },
                    }

                },
            },
        ]
    })
    await server.start()
    server.applyMiddleware({
        app,
        path:'/'
    })
    const PORT = 4000
    httpServer.listen(PORT, () => console.log(`server is now running on http://localhost/${PORT}`))
}

start()