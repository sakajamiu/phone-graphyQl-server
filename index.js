const {ApolloServer, UserInputError, gql} = require('apollo-server')
const {ApolloServerPluginLandingPageGraphQLPlayground} = require('apollo-server-core')
const {v1: uuid} = require('uuid')
let persons =[
    {
        name:"Arto Hellas",
        phone:"040-123543",
        street:"Tapiolankatu 5 A",
        city:"Espoo",
        id:"3d594650-3436-1e9-bc57-8b80ba54c431"
    },
    {
        name:"Matti Luukkainen",
        phone:"040-432342",
        street:"Malminkaari 10 A",
        city:"Helsinki",
        id:'4d599471-3456-11e9-bc57-8b80ba5c431'
    },
    {
        name: "Venla Ruuska",
        street: "Nallemäentie 22 C",
        city: "Helsinki",
        id: '3d599471-3436-11e9-bc57-8b80ba54c431'
      },
]
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
        personCount:()=> persons.length,
        allPersons:(root, args)=>{
            if(!args.phone){
                return persons
            }
            const byphone =(person) =>
                 args.phone === 'YES'? person.phone : !person.phone
            
            return persons.filter(byphone)
        },
        findPerson : (root, args) =>
            persons.find(p => p.name === args.name)
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
        addPerson:(root,args) => {
            if(persons.find(p => p.name === args.name)){
                throw new UserInputError ('Name must br unique', {
                    invalidArgs: args.name,
                })
            }
           
            const person = {...args, id: uuid()}
            persons.concat(person)
            return person
        },

        editNumber:(root,args) => {
            const person = persons.find(p => persons.name === args.name)
            if(!person){
                return null
            }
            const updatedPhone = {...person, phone: args.phone}
            persons.map(p=> p.name === args.name? updatedPhone : p)
            return updatedPhone
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