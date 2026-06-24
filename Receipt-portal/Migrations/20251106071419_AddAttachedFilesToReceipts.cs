using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subh_sankalp_estate.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachedFilesToReceipts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachedFiles",
                table: "Receipts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 6, 7, 14, 18, 549, DateTimeKind.Utc).AddTicks(3443), "$2a$11$EZJ6qaSK1oD5k6VnXQml4O0tNg76fi42jTjDPhMURs2/V98Xq89ea", new DateTime(2025, 11, 6, 7, 14, 18, 549, DateTimeKind.Utc).AddTicks(3446) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachedFiles",
                table: "Receipts");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 6, 6, 0, 2, 691, DateTimeKind.Utc).AddTicks(6827), "$2a$11$0nbeEYEa8ketQ4Bi0PNye.7V9wbdKtG8gg.m1MB0IFI7BiMQUxoJO", new DateTime(2025, 11, 6, 6, 0, 2, 691, DateTimeKind.Utc).AddTicks(6831) });
        }
    }
}
