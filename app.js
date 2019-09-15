const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

const app = express();

app.use(bodyParser.json());

const events = async (eventIds) => {
  try {
    const events = await Event.findById({ _id: { $in: eventIds } });
    return events.map(event => {
      return {
        ...event._doc,
        _id: event.id,
        creator: user.bind(this, event.creator)
      }
    });
  }
  catch (error) {
    throw error;
  }
};

const user = async (userId) => {
  try {
    const user = await User.findById(userId);
    return {
      ...user._doc,
      _id: user.id,
      createdEvents: events.bind(this, user._doc.createEvents)
    }
  }
  catch (error) {
    throw error;
  }
}

app.use(
  '/graphql',
  graphqlHttp({
    schema: buildSchema(`
        type Event {
          _id: ID!
          title: String!
          description: String!
          price: Float!
          date: String!
          creator: User!
        }

        type User {
          _id: ID!
          email: String!
          password: String
          createdEvents: [Event !]
        }

        input EventInput {
          title: String!
          description: String!
          price: Float!
          date: String!
        }

        input UserInput {
          email: String!
          password: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      events: async () => {
        try {
          const events = await Event.find().populate('creator');
          return events.map(event => {
            return {
              ...event._doc, _id: event.id,
              creator: user.bind(this, event._doc.creator)
            };
          });
        }
        catch (err) {
          throw err;
        }
      },
      createEvent: async args => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: '5d7e7f630666d409245fafa3'
        });
        let createdEvent;
        try {
          const result = await event.save();
          createdEvent = { ...result._doc, _id: result._doc._id.toString() };
          const user = await User.findById('5d7e7f630666d409245fafa3');
          if (!user) {
            throw new Error('User not found.');
          }
          user.createdEvents.push(event);
          const result_1 = await user.save();
          return createdEvent;
        }
        catch (err) {
          console.log(err);
          throw err;
        }
      },
      createUser: async args => {
        try {
          const user = await User.findOne({ email: args.userInput.email });
          if (user) {
            throw new Error('User exists already.');
          }
          const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
          const user_1 = new User({
            email: args.userInput.email,
            password: hashedPassword
          });
          const result = await user_1.save();
          return { ...result._doc, password: null, _id: result.id };
        }
        catch (err) {
          throw err;
        }
      }
    },
    graphiql: true
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${
    process.env.MONGO_PASSWORD
    }@cluster0-b6v6f.mongodb.net/${process.env.MONGO_DB}?retryWrites=true`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    app.listen(3030);
  })
  .catch(err => {
    console.log(err);
  });
