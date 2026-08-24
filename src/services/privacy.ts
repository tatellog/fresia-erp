import { db } from '../data/db'

/**
 * Sección Inversión protegida: solo aparece en los dispositivos donde la
 * dueña la muestra con su PIN. Todo vive en `meta` (local al dispositivo,
 * no se sincroniza): en el equipo de la tienda queda oculta para el
 * personal sin tocar los demás dispositivos.
 */

export const getOwnerPin = async () => (await db.meta.get('ownerPin'))?.value ?? null
export const setOwnerPin = (pin: string) => db.meta.put({ key: 'ownerPin', value: pin })

export const isInversionVisible = async () => (await db.meta.get('showInversion'))?.value === '1'
export const showInversion = () => db.meta.put({ key: 'showInversion', value: '1' })
export const hideInversion = () => db.meta.put({ key: 'showInversion', value: '0' })
