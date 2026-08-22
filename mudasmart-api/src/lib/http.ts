export const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
