import cron from 'node-cron';
import Restaurant from '../modules/restaurant/restaurant.model.js';

export const initCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Find all active restaurants that are NOT manually overridden
      const restaurants = await Restaurant.find({ 
        status: 'active',
        isManualOverride: false 
      });

      for (const restaurant of restaurants) {
        const schedule = restaurant.openingHours.find(h => h.day === currentDay);
        
        if (!schedule || schedule.isClosed) {
          if (restaurant.isOpen) {
            restaurant.isOpen = false;
            await restaurant.save();
            console.log(`[Cron] Closed ${restaurant.name} (Scheduled Closed)`);
          }
          continue;
        }

        const { openTime, closeTime } = schedule;
        const isTimeMatch = currentTime >= openTime && currentTime < closeTime;

        if (isTimeMatch && !restaurant.isOpen) {
          restaurant.isOpen = true;
          await restaurant.save();
          console.log(`[Cron] Opened ${restaurant.name} (Scheduled Open)`);
        } else if (!isTimeMatch && restaurant.isOpen) {
          restaurant.isOpen = false;
          await restaurant.save();
          console.log(`[Cron] Closed ${restaurant.name} (Scheduled Close)`);
        }
      }
    } catch (error) {
      console.error('[Cron Error] Restaurant schedule check failed:', error);
    }
  });

  console.log('[Cron] Restaurant scheduler initialized');
};
