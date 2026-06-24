using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subh_sankalp_estate.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentHistorySnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentHistorySnapshot",
                table: "Receipts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 3, 11, 21, 18, 400, DateTimeKind.Utc).AddTicks(741), "$2a$11$L/utCcBBYcwLZFX2l6Zgv.Gk9ZqnY7Aemoq8hc5RwdvM8DZ2C5PhO", new DateTime(2025, 12, 3, 11, 21, 18, 400, DateTimeKind.Utc).AddTicks(745) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentHistorySnapshot",
                table: "Receipts");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 15, 6, 49, 50, 476, DateTimeKind.Utc).AddTicks(4301), "$2a$11$v6sQoK9TdYkTfUpYnUQfjuj2Hd9iMrU.ZaXWmnE6RxPlm1fFaOUq.", new DateTime(2025, 11, 15, 6, 49, 50, 476, DateTimeKind.Utc).AddTicks(4304) });
        }
    }
}
