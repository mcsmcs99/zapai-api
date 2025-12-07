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
