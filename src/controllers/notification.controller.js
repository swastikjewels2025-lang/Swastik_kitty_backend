import { Notification } from '../models/index.js';

export const getNotificationsController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }),
      Notification.countDocuments({ userId, isRead: false })
    ]);

    const formatted = notifications.map(n => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      type: n.type,
      actionRoute: n.actionRoute,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString()
    }));

    return res.ok({
      unreadCount,
      totalCount: formatted.length,
      notifications: formatted
    }, 'Notifications retrieved.');
  } catch (error) {
    next(error);
  }
};

export const markNotificationReadController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      return res.fail('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
    }

    notification.isRead = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.ok({
      id: notification._id.toString(),
      isRead: true,
      unreadCount
    }, 'Notification marked as read.');
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsReadController = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.ok({
      markedReadCount: result.modifiedCount,
      unreadCount: 0
    }, 'All notifications marked as read.');
  } catch (error) {
    next(error);
  }
};
