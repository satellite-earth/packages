import { Router } from 'express';

const router: Router = Router();

router.get('/', (req, res) => {
	res.render('setup/index');
});

router.post('/', async (req, res, next) => {
	try {
		const { name, owner, about } = req.body as Record<string, string>;

		await (await import('./index.js')).default.createCommunity({ name, owner, about });

		res.render('setup/created');
	} catch (err) {
		next(err);
	}
});

export default router;
