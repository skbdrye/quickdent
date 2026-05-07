/**
 * Centralised SMS message templates for the QuickDent dental clinic.
 * Every message includes the clinic name so patients can immediately tell
 * which dental office is reaching out.
 */
import { formatTime } from '@/lib/utils';

export const CLINIC_NAME = 'Abrigo-Marabe Dental Clinic';

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const smsTemplates = {
  booked: (name: string, date: string, time: string, service?: string | null) =>
    `Hi ${name}, your ${service ? service + ' ' : ''}appointment at ${CLINIC_NAME} on ${fmtDate(date)} at ${formatTime(time)} has been received and is pending confirmation. We'll text you once confirmed.`,

  confirmed: (name: string, date: string, time: string) =>
    `Hi ${name}, your appointment at ${CLINIC_NAME} on ${fmtDate(date)} at ${formatTime(time)} has been CONFIRMED. Please arrive 10 minutes early. Thank you!`,

  cancelled: (name: string, date: string, time: string) =>
    `Hi ${name}, your appointment at ${CLINIC_NAME} on ${fmtDate(date)} at ${formatTime(time)} has been CANCELLED. You may rebook anytime through QuickDent.`,

  cancelledByClinic: (name: string, date: string, time: string, reason?: string) =>
    `Hi ${name}, your appointment at ${CLINIC_NAME} on ${fmtDate(date)} at ${formatTime(time)} was cancelled by the clinic.${reason ? ' Reason: ' + reason : ''} Please rebook anytime.`,

  rescheduled: (name: string, newDate: string, newTime: string) =>
    `Hi ${name}, your appointment at ${CLINIC_NAME} has been RESCHEDULED to ${fmtDate(newDate)} at ${formatTime(newTime)}. See you then!`,

  rescheduledByClinic: (name: string, newDate: string, newTime: string) =>
    `Hi ${name}, the clinic has RESCHEDULED your appointment at ${CLINIC_NAME} to ${fmtDate(newDate)} at ${formatTime(newTime)}. Please show up on time. If you can't make it, please cancel your appointment to free it up for others.`,

  completed: (name: string, date: string) =>
    `Hi ${name}, thank you for visiting ${CLINIC_NAME} on ${fmtDate(date)}. We hope to see you again for your next check-up!`,

  noShow: (name: string, date: string) =>
    `Hi ${name}, you were marked as a NO-SHOW for your ${fmtDate(date)} appointment at ${CLINIC_NAME}. Repeated no-shows may suspend your booking privileges.`,

  bookedForOther: (
    relativeName: string,
    bookerName: string,
    date: string,
    time: string,
  ) =>
    `Hi ${relativeName}, ${bookerName} booked a dental appointment for you at ${CLINIC_NAME} on ${fmtDate(date)} at ${formatTime(time)}. Please show up on time.`,

  standbyAdded: (name: string, date: string) =>
    `Hi ${name}, you've been added to the STANDBY queue at ${CLINIC_NAME} for ${fmtDate(date)}. We'll text you the moment a slot opens.`,

  standbyAssigned: (name: string, date: string, time: string) =>
    `Hi ${name}, your standby request at ${CLINIC_NAME} on ${fmtDate(date)} at ${formatTime(time)}. Please show up on time. If you can't make it, please cancel your standby slot to free it up for others.`,

  standbyCancelled: (name: string, date: string) =>
    `Hi ${name}, your standby request at ${CLINIC_NAME} for ${fmtDate(date)} has been cancelled.`,
};
