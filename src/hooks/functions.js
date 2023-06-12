export function dateId() {
    const today = new Date()
    const month = today.getMonth()
    const date = today.getDate()
    const year = today.getFullYear()
    const hours = today.getHours()
    const mins = today.getMinutes()
    const seconds = today.getSeconds()
    const id = `${month}${date}${year}${hours}${mins}${seconds}`
    return id
  }