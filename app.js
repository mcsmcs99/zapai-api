var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors'); // << ADICIONE

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var healthRouter = require('./routes/health');
var plansRoutes = require('./routes/plans');
var onboardingRoutes = require('./routes/onboarding');

var app = express();

const auth = require('./middlewares/auth');

// ---- CORS: precisa vir ANTES das rotas ----
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:9000';

app.use(cors({
  origin: FRONT_ORIGIN, // sua UI do Quasar em dev
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: true, // habilite se usar cookies/sessões
}));

// Responde preflight para qualquer rota
app.options('*', cors());

// ------------------------------------------

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/', indexRouter);

// IMPORTANTE: se seu middleware `auth` barra OPTIONS, libere o preflight:
app.use('/users', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204); // preflight ok
  return next();
}, auth(true), usersRouter);
app.use('/plans', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), plansRoutes);
app.use('/onboarding', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), onboardingRoutes);

app.use('/health', healthRouter);
app.use('/auth', authRouter);

module.exports = app;
