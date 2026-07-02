export class UserController {
  async me(req, res) {
    res.json({
      success: true,
      data: req.user,
    });
  }
}
