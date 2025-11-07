'use strict';
const { Op } = require('sequelize');
const {
  Group,
  Plan,
  UsersGroup,
  GroupsPlanPayment,
  Tenant,
  User,               // 👈 importar User
  sequelize
} = require('../models');

// uuid (ESM -> import dinâmico para CommonJS)
async function uuidv4 () {
  const { v4 } = await import('uuid');
  return v4();
}

function onlyDigits (s) {
  return String(s || '').replace(/\D+/g, '');
}

const ALLOWED_PAYMENT = new Set(['credit_card', 'pix', 'billet']);

exports.complete = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const userId = req?.user?.sub;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    const { company, plan, payment } = req.body || {};
    if (!company || !plan || !payment) {
      await t.rollback();
      return res.status(400).json({ message: 'Payload inválido.' });
    }

    // Plano
    let foundPlan = null;
    if (plan?.id) {
      foundPlan = await Plan.findOne({ where: { id: plan.id, status: 'active' }, transaction: t });
    } else if (plan?.unique_key) {
      foundPlan = await Plan.findOne({ where: { unique_key: plan.unique_key, status: 'active' }, transaction: t });
    }
    if (!foundPlan) {
      await t.rollback();
      return res.status(400).json({ message: 'Plano inválido ou inativo.' });
    }

    // Pagamento
    const payType = (payment?.type || 'pix').toLowerCase();
    if (!ALLOWED_PAYMENT.has(payType)) {
      await t.rollback();
      return res.status(400).json({ message: 'Tipo de pagamento inválido.' });
    }

    // 1) Group
    const group = await Group.create({
      unique_key: await uuidv4(),
      document_type: company.document_type || 'cnpj',
      document_number: onlyDigits(company.document_number),
      company_name: (company.company_name || '').trim(),
      company_fantasy_name: (company.company_fantasy_name || '').trim(),
      phone_fix: onlyDigits(company.phone_fix),
      phone_cellular: onlyDigits(company.phone_cellular),
      link_instagram: company.link_instagram || null,
      link_facebook: company.link_facebook || null,
      link_whatsapp: company.link_whatsapp || null,
      tenant_id: null,
      status: company.status || 'active',
      created_by: userId
    }, { transaction: t });

    // 2) Tenant (db name)
    const dbName = `zapai_api_${group.id}`;
    const tenant = await Tenant.create({
      data: dbName,
      created_by: userId
    }, { transaction: t });

    // 3) Atualiza group.tenant_id
    await group.update({ tenant_id: tenant.id, updated_by: userId }, { transaction: t });

    // 4) UsersGroup
    await UsersGroup.create({
      user_id: userId,
      group_id: group.id,
      invited_by: null,
      created_by: userId
    }, { transaction: t });

    // 5) GroupsPlanPayment
    const gpp = await GroupsPlanPayment.create({
      unique_key: await uuidv4(),
      group_id: group.id,
      plan_id: foundPlan.id,
      status: 'approved',
      price: foundPlan.price,
      discount: 0.00,
      cupon: null,
      type: payType,
      req_gateway: payment?.req_gateway || null,
      res_gateway: payment?.res_gateway || null,
      created_by: userId
    }, { transaction: t });

    // 6) Ativar o usuário após concluir o pagamento/assinatura
    await User.update(
      { status: 'active', updated_by: userId },
      { where: { id: userId }, transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      message: 'Onboarding concluído com sucesso.',
      group,         // já com tenant_id
      tenant,
      payment: gpp,
      plan: foundPlan,
      db: dbName
    });
  } catch (err) {
    if (t.finished !== 'commit') await t.rollback();
    return next(err);
  }
};
