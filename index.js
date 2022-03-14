const {ApolloServer, UserInputError, gql} = require('apollo-server')
const {ApolloServerPluginLandingPageGraphQLPlayground, AuthenticationError} = require('apollo-server-core')
const mongoose = require('mongoose')
const Person  = require('./models/persons')
const User = require('./models/user')
require('dotenv').config()
const {v1: uuid} = require('uuid')
const jwt = require('jsonwebtoken')
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
type User{
    username: String!
    friends: [Person!]!
    id: ID!
}
type Token{
    value: String!
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
    createUser(
        username: String!
    ):User
    login(
        username: String!
        passsword: String!
    ):Token
}
type Query {
    personCount: Int!
    allPersons(phone: YesNo):[Person!]!
    findPerson(name:String!):Person
    me: User
    
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
        me: async( root, args, context) =>{
            return context.currentUser
        }
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
        addPerson:async(root,args,context) => {
           const person = new Person({...args})
           const currentUser = context.currentUser
           if(!currentUser){
               throw new AuthenticationError("not authenticated")
           }
           try{
            await  person.save()
            currentUser.friends = currentUser.friends.concat(person)
            await currentUser.save()
           }catch(error){
               throw new UserInputError(error.message,{
                invalidArgs: args
               })
           }
           return person      
        },

        editNumber:async (root,args) => {
            const person = await Person.findOne({name: args.name})
            person.phone = args.phone
            try{
                await person.save()
            }catch (error){
                throw new UserInputError( error.message, {
                    invalidArgs: args
                })
            }
            return  person
        },
        createUser: async(root,args) => {
            const user = new User({ username  : args.username})
            return user.save()
             .catch(error => {
                 throw new UserInputError(error.message, {
                    invalidArgs : args
                 })
             })
        },
        login: async(root,args) => {
            const user = await User.findOne({username: args.username})

            if(!user|| args.password!== 'Secret'){
                throw new UserInputError ("Wrong Credentials")
            }
            const userForToken = {
                username: user.username,
                id: user._id,
            }
            return {value: jwt.sign(userForToken, process.env.SECRET)}
        },
    }
}
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context:async ({req}) => {
        const auth = req ? req.headers.authorization : null
        if (auth && auth.toLowerCase().startsWith('bearer')){
            const decodedToken = jwt.verify(
                auth.substring(7), process.env.SECRET
            )
            const currentUser = await User.findById(decodedToken).populate('friends')
            return { currentUser }
        }
    },
    plugins:[
        ApolloServerPluginLandingPageGraphQLPlayground(),
    ]
})

server.listen().then(({url}) => {
    console.log(`server ready at ${url}`)
})