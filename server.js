const express = require('express')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express()
const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = mongoose.Schema({ username: { type: String, unique: true } });
const User = mongoose.model('User', userSchema);

const exerciseSchema = mongoose.Schema({ userId: String, description: String, duration: Number, date: Date });
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  let users = await User.find();

  res.json(users);
})

app.post('/api/users', (req, res) => {
  const newUser = new User({ username: req.body.username });

  newUser.save((err, data) => {
    if (err) {
      res.send('Username already taken')
    } else {
      res.json({ username: data.username, _id: data.id })
    }
  });
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  let { description, duration, date } = req.body;
  if (!date) date = new Date();

  console.log(userId);
  await User.findById(userId, (err, data) => {
    if (!data) {
      res.send('Unknown userId');
    } else {
      const newExercise = new Exercise({ userId, description, duration, date });

      const username = data.username;

      newExercise.save((err, data) => {
        res.json({ _id: userId, username, date: new Date(date).toDateString(), duration: Number(duration), description });
      });
    }
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  console.log(from, to, limit);

  User.findById(userId, (err, data) => {
    const username = data.username;

    if (!data) res.send('Unknown userId');

    Exercise.find({userId}, { date: {
      $gte: new Date(from), 
      $lt: new Date(to)
    } }).select('id description duration date').limit(Number(limit)).exec((err, data) => {
      const count = !data ? 0 : data.length; 
      const logData = !data ? [] : data.map(({ description, duration, date }) => {
          date = new Date(date).toDateString();
        return { description, duration, date };
      });

      res.json({ _id: userId, username, count, log: logData })
    });
  });
  
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
