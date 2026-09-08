// 删除目标的统一温柔确认文案（与用户确认过的 A 版）
export function confirmDeleteGoal(onConfirm) {
  uni.showModal({
    title: '确定要删除这个目标吗？',
    content:
      '删除后，这个目标之前的打卡记录也会一起消失。别急着放弃——坚持本身就是很了不起的事，要不要再给自己几天？',
    confirmText: '仍要删除',
    cancelText: '继续坚持',
    confirmColor: '#E5484D',
    success: res => {
      if (res.confirm && typeof onConfirm === 'function') {
        onConfirm()
      }
    }
  })
}
