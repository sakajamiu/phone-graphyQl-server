const {ApolloServer, UserInputError, gql} = require('apollo-server')
const {ApolloServerPluginLandingPageGraphQLPlayground} = require('apollo-server-core')
const mongoose = require('mongoose')
const Person  = require('./models/persons')
require('dotenv').config()
const {v1: uuid} = require('uuid')
const MONGODB_URI = process.env.MONGODB_URI

console.log('connecting to', MONGODB_URI)
mongoose.connect(MONGODB_URI)
 .then(() =>{
     console.log('connected to MongoDB')
 })
 .catch((error) =>{
     console.log('error connecting to MongoDb', error.message)
 })


const typeDefs = gql`
type Address {
    street: String!
    city: String!
}
enum YesNo{
    YES
    NO
}
type Person {
    name: String!
    phone: String
    address: Address!
    id:ID!

}
type Mutation{
    addPerson(
        name: String!
        phone: String
        street: String!
        city: String!
    ):Person
    editNumber(
        phone: String!
        name: String!
    ):Person
}
type Query {
    personCount: Int!
    allPersons(phone: YesNo):[Person!]!
    findPerson(name:String!):Person
}
`
const resolvers = {
    Query:{
        personCount:async()=>  Person.collection.countDocuments(),
        allPersons:async(root, args)=>{
            if(!args.phone){     
            return Person.find({})
            }
            return Person.find({phone:{$exists: args.phone === 'YES'}})
        },
        findPerson : async(root, args) =>
             Person.findOne({name : args.name}),
    },
    Person:{
        address:(root) =>{
           return{
            street: root.street,
            city: root.city
          }
        }
    },
    Mutation: {
        addPerson:async(root,args) => {
           const person = new Person({...args})
           try{
            await  person.save()
           }catch(error){
               throw new UserInputError(error.message,{
                invalidArgs: args
               })
           }
           return person      
        },

        editNumber:async (root,args) => {
            const person = await person.findOne({name: args.name})
            person.phone = args.phone
            try{
                await person.save()
            }catch (error){
                throw new UserInputError( error.message, {
                    invalidArgs: args
                })
            }
            return  person
        }
    }
}
const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins:[
        ApolloServerPluginLandingPageGraphQLPlayground(),
    ]
})

server.listen().then(({url}) => {
    console.log(`server ready at ${url}`)
})