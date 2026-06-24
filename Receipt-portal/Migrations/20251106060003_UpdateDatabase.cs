using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subh_sankalp_estate.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDatabase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 6, 6, 0, 2, 691, DateTimeKind.Utc).AddTicks(6827), "$2a$11$0nbeEYEa8ketQ4Bi0PNye.7V9wbdKtG8gg.m1MB0IFI7BiMQUxoJO", new DateTime(2025, 11, 6, 6, 0, 2, 691, DateTimeKind.Utc).AddTicks(6831) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 4, 10, 26, 55, 523, DateTimeKind.Utc).AddTicks(8513), "$2a$11$7D58e5HhwUHFiFBpyFzTfObGmtEi3N0RAKcD99ZAy1LSgy.c0TTNS", new DateTime(2025, 11, 4, 10, 26, 55, 523, DateTimeKind.Utc).AddTicks(8517) });
        }
    }
}
