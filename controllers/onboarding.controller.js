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
  const t = await sequelize.transaction()
  try {
    const userId = req?.user?.sub
    if (!userId) {
      await t.rollback()
      return res.status(401).json({ message: 'Não autenticado.' })
    }

    const { company, plan, payment } = req.body || {}

    // agora valida usando company.id em vez de group_id separado
    if (!company || !plan || !payment || !company.id) {
      await t.rollback()
      return res.status(400).json({ message: 'Payload inválido.' })
    }

    // Plano
    let foundPlan = null
    if (plan?.id) {
      foundPlan = await Plan.findOne({ where: { id: plan.id, status: 'active' }, transaction: t })
    } else if (plan?.unique_key) {
      foundPlan = await Plan.findOne({ where: { unique_key: plan.unique_key, status: 'active' }, transaction: t })
    }
    if (!foundPlan) {
      await t.rollback()
      return res.status(400).json({ message: 'Plano inválido ou inativo.' })
    }

    // Pagamento
    const payType = (payment?.type || 'pix').toLowerCase()
    if (!ALLOWED_PAYMENT.has(payType)) {
      await t.rollback()
      return res.status(400).json({ message: 'Tipo de pagamento inválido.' })
    }

    // 1) Carrega o Group já criado no passo da empresa
    const group = await Group.findOne({
      where: { id: company.id, created_by: userId }, // 👈 usa company.id como group_id
      transaction: t
    })

    if (!group) {
      await t.rollback()
      return res.status(400).json({ message: 'Grupo não encontrado para este usuário.' })
    }

    // (Opcional) atualizar algum campo da empresa com o que veio agora
    await group.update({
      company_name: (company.company_name || '').trim(),
      company_fantasy_name: (company.company_fantasy_name || '').trim(),
      phone_fix: onlyDigits(company.phone_fix),
      phone_cellular: onlyDigits(company.phone_cellular),
      link_instagram: company.link_instagram || null,
      link_facebook: company.link_facebook || null,
      link_whatsapp: company.link_whatsapp || null,
      status: company.status || group.status,
      updated_by: userId
    }, { transaction: t })

    // 2) Tenant (db name)
    const dbName = `zapai_api_${group.id}`
    const tenant = await Tenant.create({
      data: dbName,
      created_by: userId
    }, { transaction: t })

    // 3) Atualiza group.tenant_id
    await group.update({ tenant_id: tenant.id, updated_by: userId }, { transaction: t })

    // 4) (UsersGroup já criado lá atrás. Se quiser garantir, pode verificar aqui.)

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
    }, { transaction: t })

    // 6) Ativar o usuário
    await User.update(
      { status: 'active', updated_by: userId },
      { where: { id: userId }, transaction: t }
    )

    await t.commit()
    return res.status(201).json({
      message: 'Onboarding concluído com sucesso.',
      company: group,
      group,
      tenant,
      payment: gpp,
      plan: foundPlan,
      db: dbName
    })
  } catch (err) {
    if (t.finished !== 'commit') await t.rollback()
    return next(err)
  }
}


exports.saveCompany = async (req, res, next) => {
  const t = await sequelize.transaction()
  try {
    const userId = req?.user?.sub
    if (!userId) {
      await t.rollback()
      return res.status(401).json({ message: 'Não autenticado.' })
    }

    const { company } = req.body || {}
    if (!company) {
      await t.rollback()
      return res.status(400).json({ message: 'Payload inválido.' })
    }

    // validações mínimas
    if (!company.company_name || !company.document_number) {
      await t.rollback()
      return res.status(400).json({
        message: 'Razão social e CNPJ são obrigatórios.'
      })
    }

    let group

    // SE TIVER ID → ATUALIZA
    if (company.id) {
      group = await Group.findOne({
        where: {
          id: company.id,
          created_by: userId
        },
        transaction: t
      })

      if (!group) {
        await t.rollback()
        return res.status(404).json({
          message: 'Empresa não encontrada para este usuário.'
        })
      }

      await group.update({
        document_type: company.document_type || group.document_type || 'cnpj',
        document_number: onlyDigits(company.document_number),
        company_name: (company.company_name || '').trim(),
        company_fantasy_name: (company.company_fantasy_name || '').trim(),
        phone_fix: onlyDigits(company.phone_fix),
        phone_cellular: onlyDigits(company.phone_cellular),
        link_instagram: company.link_instagram || null,
        link_facebook: company.link_facebook || null,
        link_whatsapp: company.link_whatsapp || null,
        country_id: company.country_id || null,
        status: company.status || group.status,
        updated_by: userId
      }, { transaction: t })

      // aqui NÃO recriamos UsersGroup, assumimos que já existe do primeiro save

    // SE NÃO TIVER ID → CRIA
    } else {
      group = await Group.create({
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
        country_id: company.country_id || null,
        tenant_id: null,
        status: company.status || 'active',
        created_by: userId
      }, { transaction: t })

      // 2) UsersGroup (relacionando o usuário logado ao grupo criado)
      await UsersGroup.create({
        user_id: userId,
        group_id: group.id,
        invited_by: null,
        created_by: userId
      }, { transaction: t })
    }

    await t.commit()
    return res.status(201).json({
      message: 'Dados da empresa salvos com sucesso.',
      company: group,
      group
    })
  } catch (err) {
    if (t.finished !== 'commit') await t.rollback()
    return next(err)
  }
}

/**
 * GET /onboarding/company
 * Retorna a empresa (group) vinculada ao usuário autenticado
 */
exports.getCompany = async (req, res, next) => {
  try {
    const userId = req?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    // pega o último grupo criado pelo usuário (ou ajuste a regra se quiser outra lógica)
    const group = await Group.findOne({
      where: { created_by: userId },
      order: [['id', 'DESC']]
    });

    if (!group) {
      return res.status(404).json({ message: 'Nenhuma empresa encontrada para este usuário.' });
    }

    return res.json({
      company: group, // front usa como "company"
      group         // mantido por compatibilidade se algo ainda usar "group"
    });
  } catch (err) {
    return next(err);
  }
}
