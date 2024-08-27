import { Response, Request } from 'express';
import KYC from '../models/kycModels';
import { MulterRequest } from '../../types/types';

export const submitKYC = async (req: MulterRequest, res: Response) => {
  try {
    const { documentType, documentNumber } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Document image is required' });
    }

    const mimeType = req.file.mimetype;
    const documentImage = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;

    const kyc = new KYC({ userId, documentType, documentNumber, documentImage });
    await kyc.save();

    res.status(201).json({ message: 'KYC submitted successfully', kyc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getKYCStatus = async (req: MulterRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: 'User not authenticated' });
    }

    const kyc = await KYC.findOne({ userId });

    if (!kyc) {
      return res.status(404).json({ message: 'KYC not found' });
    }

    res.status(200).json({ kyc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const approveKYC = async (req: Request, res: Response) => {
  try {
    const kycId = req.params.id;
    const kyc = await KYC.findById(kycId);

    if (!kyc) {
      return res.status(404).json({ message: 'KYC not found' });
    }

    kyc.status = 'approved';
    await kyc.save();

    res.status(200).json({ message: 'KYC approved successfully', kyc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const rejectKYC = async (req: Request, res: Response) => {
  try {
    const kycId = req.params.id;
    const kyc = await KYC.findById(kycId);

    if (!kyc) {
      return res.status(404).json({ message: 'KYC not found' });
    }

    kyc.status = 'rejected';
    await kyc.save();

    res.status(200).json({ message: 'KYC rejected successfully', kyc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};