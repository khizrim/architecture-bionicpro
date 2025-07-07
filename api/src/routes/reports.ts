import express from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Генерация случайных данных для отчета
const generateReportData = (userId: string) => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  return {
    userId,
    reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: now.toISOString(),
    period: {
      from: lastMonth.toISOString(),
      to: now.toISOString()
    },
    prosthetics: [
      {
        id: `prosthetic_${userId}_1`,
        type: 'Arm Prosthetic',
        model: 'BionicPRO ARM-X1',
        activationDate: new Date(2024, 0, 15).toISOString(),
        batteryStats: {
          averageLifetime: `${Math.floor(Math.random() * 8) + 10} hours`,
          chargesCycles: Math.floor(Math.random() * 100) + 50,
          currentHealthPercentage: Math.floor(Math.random() * 30) + 70
        },
        usageStats: {
          totalHours: Math.floor(Math.random() * 500) + 200,
          averageDailyUsage: `${Math.floor(Math.random() * 8) + 4} hours`,
          mostUsedGestures: ['Grip', 'Point', 'Wave', 'Pinch'],
          responseTime: `${Math.floor(Math.random() * 30) + 70}ms`
        },
        maintenanceHistory: [
          {
            date: new Date(2024, 2, 15).toISOString(),
            type: 'Calibration',
            description: 'Myosignal calibration and gesture training'
          },
          {
            date: new Date(2024, 1, 1).toISOString(),
            type: 'Software Update',
            description: 'Updated gesture recognition algorithm to v2.1'
          }
        ]
      }
    ],
    summary: {
      totalDevices: 1,
      activeDevices: 1,
      alertsCount: Math.floor(Math.random() * 5),
      recommendedActions: [
        'Schedule regular calibration sessions',
        'Monitor battery health',
        'Update gesture library'
      ]
    }
  };
};

// GET /reports - получить отчет пользователя
router.get('/', authenticateToken, requireRole('prothetic_user'), (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const reportData = generateReportData(req.user.sub);
    
    res.json({
      status: 'success',
      data: reportData
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate report'
    });
  }
});

// GET /reports/download - скачать отчет в формате JSON
router.get('/download', authenticateToken, requireRole('prothetic_user'), (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    const reportData = generateReportData(req.user.sub);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bionic_report_${Date.now()}.json"`);
    
    res.json(reportData);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download report'
    });
  }
});

export default router; 