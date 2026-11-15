export class WarehouseApiError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'WarehouseApiError';
  }
}

export function getWarehouseErrorMessage(error: unknown) {
  if (error instanceof WarehouseApiError) {
    return error.message;
  }

  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

export function getHttpErrorMessage(status: number) {
  switch (status) {
    case 400:
      return 'Проверьте введённые данные и повторите попытку.';
    case 401:
      return 'Необходимо войти в систему. Повторите действие после входа.';
    case 403:
      return 'Недостаточно прав для операции со складом.';
    case 404:
      return 'Склад не найден или больше недоступен. Обновите список.';
    default:
      return 'Сервер не смог выполнить запрос. Попробуйте ещё раз.';
  }
}
