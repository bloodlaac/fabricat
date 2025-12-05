import os

# Путь к проекту
project_path = r"C:\my_dump\study\management\management_site"
output_file = os.path.join(project_path, "project_code.txt")

# Папки для экспорта
folders = ["src", "public"]

# Создаём или перезаписываем файл
with open(output_file, "w", encoding="utf-8") as out:
    for folder in folders:
        folder_path = os.path.join(project_path, folder)
        if os.path.exists(folder_path):
            for root, _, filenames in os.walk(folder_path):
                for fname in filenames:
                    file_path = os.path.join(root, fname)
                    print(f"Обрабатываем: {file_path}")  # Для контроля
                    out.write(f"\n===== {file_path} =====\n")
                    try:
                        # Читаем весь файл целиком
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            out.write(content)
                    except Exception as e:
                        out.write(f"[Ошибка чтения файла: {e}]\n")
                    out.write("\n")  # Отделяем файлы пустой строкой
        else:
            print(f"Папка не найдена: {folder_path}")

print(f"\nГотово! Все файлы из src и public сохранены в {output_file}")
