// controllers/users.controller.js
'use strict'

const { User } = require('../models')

module.exports = {
  /**
   * GET /users/admin
   * Retorna o primeiro super_admin ativo
   */
  async getAdmin (req, res, next) {
    try {
      const admin = await User.findOne({
        where: { type: 'super_admin', status: 'active' }
      })

      if (!admin) {
        return res
          .status(404)
          .json({ message: 'Super admin não encontrado' })
      }

      // defaultScope já exclui password
      return res.json(admin)
    } catch (err) {
      return next(err)
    }
  },

  /**
   * PATCH /users/:id/current-group
   * Atualiza o current_group_id do usuário
   */
  async updateCurrentGroup (req, res, next) {
    try {
      const { id } = req.params
      const { current_group_id } = req.body

      if (typeof current_group_id === 'undefined') {
        return res.status(400).json({
          message: 'Campo current_group_id é obrigatório no corpo da requisição'
        })
      }

      const user = await User.findByPk(id)

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }

      user.current_group_id = current_group_id
      await user.save()

      // defaultScope já remove campos sensíveis (ex: password)
      return res.json(user)
    } catch (err) {
      return next(err)
    }
  },

  /**
   * PATCH /users/:id
   * Atualiza dados do perfil do usuário (nome, tipo, status, etc.)
   */
  async updateProfile (req, res, next) {
    try {
      const { id } = req.params

      const user = await User.findByPk(id)

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }

      // Campos permitidos para atualização
      const {
        name,
        type,
        status
        // phone // <- se você criar esse campo na tabela users, pode incluir aqui
      } = req.body

      // Atualiza apenas o que foi enviado (PATCH parcial)
      if (typeof name !== 'undefined') {
        user.name = name
      }

      if (typeof type !== 'undefined') {
        user.type = type
      }

      if (typeof status !== 'undefined') {
        user.status = status
      }

      // Se depois você adicionar coluna phone no model:
      // if (typeof phone !== 'undefined') {
      //   user.phone = phone
      // }

      await user.save()

      // defaultScope já exclui password
      return res.json(user)
    } catch (err) {
      return next(err)
    }
  },

  /**
   * GET /users/:id
   * Retorna um usuário por id
   */
  async getById (req, res, next) {
    try {
      const user = await User.findByPk(req.params.id)

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }

      // defaultScope exclui password
      return res.json(user)
    } catch (err) {
      return next(err)
    }
  }
}
