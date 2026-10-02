import { Request, Response, NextFunction } from 'express';
import { CorporateService } from '../services/corporate.service';

export class CorporateController {
  public static async createCorporate(req: Request, res: Response, next: NextFunction) {
    try {
      const corporate = await CorporateService.createCorporate(req.body);
      res.status(201).json({
        status: 'success',
        data: corporate,
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  }

  public static async addAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { corporateId } = req.params;

      // we will call the service layer that injects the accounts to corporateAdmin. 
      // if we want to add extra corporate level admin accounts,
      // we can do that here.

      res.status(200).json({
        status: 'success',
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }
}
