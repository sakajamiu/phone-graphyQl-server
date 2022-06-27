const { AuthenticationError, UserInputError } = require('apollo-server')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()
const Person  = require('./models/persons')
const User = require('./models/user')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.SECRET

const resolvers = {
    Query:{
        personCount:async()=>  Person.collection.countDocuments(),
        allPersons:async(root, args)=>{
            if(!args.phone){     
            return Person.find({})
            }
            return Person.find({phone:{$exists: args.phone === 'YES'}})
        },
        findPerson : async(root, args) =>{
            console.log(args.name)
             return Person.findOne({name : args.name})},
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
           pubsub.publish('PERSON_ADDED', { personAdded: person})
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
            console.log(user)
            console.log(args)

            if(!user|| args.password  !=='Secret'){
                console.log('wrong credentials')
                throw new UserInputError (error.message, {
                    invalidArgs: "Wrong Credentials"
                })
                
            }
            const userForToken = {
                username: user.username,
                id: user._id,
            }
            return { value: jwt.sign(userForToken, JWT_SECRET) }
        },
        addASFriend: async(root, args, { currentUser}) => {
            const nonFriendAlready = (person) => 
                !currentUser.friends.map( f => f._id.toString()).includes(person._id.toString())
            
            if(!currentUser){
                throw new AuthenticationError("not authenticated")
            }
            const person = await Person.findOne({ name :args.name})
            if (nonFriendAlready(person)){
                currentUser.friends = currentUser.friends.concat(person)
            }
            await currentUser.save()
            return currentUser
        },
    },
    Subscription: {
        personAdded: {
            subscribe:() => pubsub.asyncIterator(['PERSON_ADDED'])
        }
    }
}

module.exports = resolvers