var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors'); // << ADICIONE

// Routes principal base
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');
const plansRoutes = require('./routes/plans');
const groupsRoutes = require('./routes/groups');
const countriesRoutes = require('./routes/countries');
const onboardingRoutes = require('./routes/onboarding');

// Routes tenant base
const tenantStaffRoutes = require('./routes/tenant/staff');
const tenantServiceRoutes = require('./routes/tenant/services');
const tenantAppointmentRoutes = require('./routes/tenant/appointments');

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
// Routes principal base
app.use('/users', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204); // preflight ok
  return next();
}, auth(true), usersRouter);
app.use('/plans', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), plansRoutes);
app.use('/groups', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), groupsRoutes);
app.use('/countries', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), countriesRoutes);
app.use('/onboarding', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), onboardingRoutes);

app.use('/health', healthRouter);
app.use('/auth', authRouter);

// Routes tenant base
app.use('/tenant/staff', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), tenantStaffRoutes);
app.use('/tenant/services', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), tenantServiceRoutes);
app.use('/tenant/appointments', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}, auth(true), tenantAppointmentRoutes);

module.exports = app;
